using Printf

mutable struct State
    xyz::Array{Float64, 2}
    energy::Float64
    size::Int
end

function calc_energy(state::State)
    xyz = state.xyz

    OH1 = xyz[2,:] - xyz[1,:]
    OH2 = xyz[3,:] - xyz[1,:]
    dOH1 = sqrt(OH1' * OH1)
    dOH2 = sqrt(OH2' * OH2)
    
    ctheta = (OH1' * OH2)/(dOH1*dOH2)
    theta = acos(ctheta)

    Kb = 502416.0 # kJ mol-1 nm-2
    Kt = 628.02   # kJ mol-1 rad-2

    energy  = Kb * (dOH1 - 0.09572)^2
    energy += Kb * (dOH2 - 0.09572)^2
    energy += Kt * (theta - deg2rad(104.52))^2

    state.energy = energy

end



# function multiplexer(in_channel::Channel, out_channels::Channel...)
#     item = take!(in_channel)
#     for ch in out_channels
#         put!(ch, deepcopy(item))
#     end
# end


function vdw_cluster(state::State)
    #println("vdw_cluster")
    σ = 1.0     # Å
    ϵ = 1.0     # kJ mol-1

    energy = 0.0
    xyz = state.xyz
    n_atoms = state.size    # number of atoms
    
    for i in 1:(n_atoms-1)
        for j in (i+1):n_atoms
            
            dijSq = (xyz[i,:]' * xyz[j,:])
            f6 = (σ*σ/dijSq)^3
            energy += f6*f6 -f6
        end
    end
    
    return energy
end






function sa_driver(
    max_iter,
    in_state_channel::Channel{State},
    out_state_channels::Vector{Channel{State}})
    
    
    #while isopen(in_state_channel)
    for iteration in 1:max_iter

        println("sa_driver")
        
        state = take!(in_state_channel)
        nsteps = 5000
        Ti = 300
        
        e_old = vdw_cluster(state)

        for i in 1:nsteps
            RT = 0.008314 * Ti*(1.0 - i/nsteps)

            for i in 1:state.size
                old = state.xyz[i,:]
                state.xyz[i,:] .+= 0.1*randn(3)
                e_new = vdw_cluster(state)
                if (e_new < e_old) || (rand() < exp(-(e_new-e_old)/RT))
                    e_old = e_new
                else
                    state.xyz[i,:] = old
                end
            end
        end
        state.energy = e_old
        #println(e_old)
        for ch in out_state_channels
            put!(ch, deepcopy(state))
        end
    end


end


function switcher(
    in_bool_channel::Channel{Bool},
    in_state_channel::Channel{State},
    out_true_channel::Channel{State},
    out_false_channel::Channel{State})

    while true
        bool = take!(in_bool_channel)
        state = take!(in_state_channel)

        if bool
            put!(out_true_channel, state)
        else
            put!(out_false_channel, state)
        end

    end
end

# function mc_driver(
#     max_iter,
#     in_state_channel::Channel{State},
#     out_state_channel::Channel{State})

#     dmax = 0.1
#     nsteps = 5000
#     RT =  0.008314 * 300

#     for iteration in 1:max_iter

#         state = take!(in_state_channel)
#         e_old = vdw_cluster(state)

#         for i in 1:nsteps
#             for i in 1:state.size
#                 old = state.xyz[i,:]
#                 state.xyz[i,:] .+= dmax*randn(3)
#                 e_new = vdw_cluster(state)
#                 if (e_new < e_old) || (rand() < exp(-(e_new-e_old)/RT))
#                     e_old = e_new
#                 else
#                     state.xyz[i,:] = old
#                 end
#             end
#         end

#         state.energy = e_old
#         put!(out_state_channel, deepcopy(state))

#     end

# end

function metropolis(
    temperature::Float64,
    in_state_channel::Channel{State},
    in_best_channel::Channel{State},
    out_state_channels::Vector{Channel{State}})

    while true
        state = take!(in_state_channel)
        best = take!(in_best_channel)
        es = state.energy
        eb = best.energy

        if (es < eb) || (rand() < exp(-(es-eb)/temperature))
            best = state
        end

        for ch in out_state_channels
            put!(ch, deepcopy(best))
        end

    end


end



function best_selector(
    in_state_channel::Channel{State},
    in_best_channel::Channel{State},
    out_best_channel::Vector{Channel{State}},
    out_flag_channel::Vector{Channel{Bool}})
    
    while isopen(in_state_channel) && isopen(in_best_channel)
        println("best_selector")

        state = take!(in_state_channel)
        best = take!(in_best_channel)
        is_best_flag = false
        if state.energy < best.energy
            is_best_flag = true
            best = state
        end

        for ch in out_best_channel
            put!(ch, deepcopy(best))
        end
        
        for ch in out_flag_channel
            put!(ch, is_best_flag)
        end
    
    end # end while

end

function jump(
    magnitude::Float64,
    in_state_channel::Channel{State},
    out_state_channels::Vector{Channel{State}})

    while true
        state = take!(in_state_channel)
        state.xyz .+= magnitude * randn(state.size, 3)
        
        for ch in out_state_channels
            put!(ch, deepcopy(state))
        end

    end
end


function echo(in_flag_channel::Channel{Bool})
    # println("echo: channel is closed = ", isopen(in_flag_channel))
    # println("echo")
    while isopen(in_flag_channel)
        flag = take!(in_flag_channel)
        println("is best =", flag)
    end
end


function write_xyz(filename, in_state_channel::Channel{State}, in_flag_channel::Channel{Bool})
    io = open(filename, "w")
    while isopen(in_state_channel)
        println("write_xyz")
        state = take!(in_state_channel)
        flag = take!(in_flag_channel)

        write(io, "$(state.size)\nbest=$flag energy=$(state.energy)\n")
        for i in 1:state.size
            write(io, @sprintf("H %9.4f %9.4f %9.4f\n", state.xyz[i,1], state.xyz[i,2], state.xyz[i,3]))
        end
    end
    close(io)
end





state = State(10*rand(10,3), Inf, 10)
state.energy = vdw_cluster(state)
println("input energy = ", state.energy)

# TESTE ====================================================
# const channel1 = Channel{State}(5)
# const channel2 = Channel{State}(5)
# const channel3 = Channel{State}(5)
# const channel4 = Channel{Bool}(5)
# const channel5 = Channel{State}(5)
# const channel6 = Channel{Bool}(5)

# function start()
#     put!(channel1, deepcopy(state))
#     put!(channel2, state)    
# end


# sa_driver_task = @task sa_driver(100, channel1, channel3)
# selector_task  = @task best_selector(channel3, channel2, [channel1,channel2,channel5], [channel4,channel6])
# echo_task      = @task echo(channel4)
# write_xyz_task = @task write_xyz("treta.xyz", channel5, channel6)

# start()

# schedule(sa_driver_task)
# schedule(selector_task)
# schedule(echo_task)
# schedule(write_xyz_task)
# yield()

# wait(sa_driver_task)

# # wait(selector_task)
# # wait(echo_task)
# # wait(write_xyz_task)

# println(istaskstarted(sa_driver_task), ", done=", istaskdone(sa_driver_task))
# println(istaskstarted(selector_task), ", done=", istaskdone(selector_task))
# println(istaskstarted(echo_task), ", done=", istaskdone(echo_task))
# println(istaskstarted(write_xyz_task), ", done=", istaskdone(write_xyz_task))




# ILSRR --------
const channel1 = Channel{State}(5)
const channel2 = Channel{State}(5)
const channel3 = Channel{State}(5)
const channel4 = Channel{State}(5)
const channel5 = Channel{State}(5)
const channel6 = Channel{Bool}(5)
const channel7 = Channel{State}(5)
const channel8 = Channel{State}(5)


put!(channel1, deepcopy(state))
put!(channel2, deepcopy(state))
put!(channel4, deepcopy(state))


sa_driver_task = @task sa_driver(5, channel1, [channel3, channel5])
selector_task  = @task best_selector(channel3, channel2, [channel2], [channel6])
switch_task = @task switcher(channel6, channel5, channel1, channel7)
metropolis_task = @task metropolis(5.0, channel7, channel4, [channel4, channel8])
jump_task = @task jump(10.0, channel8, [channel1])


schedule(sa_driver_task)
schedule(selector_task)
schedule(switch_task)
schedule(metropolis_task)
schedule(jump_task)
yield()


wait(sa_driver_task)
