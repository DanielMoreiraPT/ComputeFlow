"""
# module Run

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""
module Run
    import Base.Threads.@spawn
    include("JsonReader.jl")
    modules = JsonReader.upload_modules("Computation/Aneta/ToUppercase_test.json")
    #import Base.Threads.@everywhere
    #import Distributed.@everywhere
    #@async include("FileReader.jl")
    #using JSON
    modules_dict = Dict()
    modules_inputs = []
    tasks = []
    global ToUpercase_channel = Channel(1)

    for m in modules
        include(m.functionid*".jl")
        channels = []
        # push!(modules_inputs, channels)
        if length(m.io.inputs) > 0
            string = "$(m.functionid).$(m.functionid)_f("

            for io in m.io.inputs
                channel = Channel(1)
                string = string * "ToUpercase_channel"
                push!(channels,channel)
                #println(summary(modules_inputs[m.id][]))
                # string = "$(m.functionid).$(m.functionid)_f($(channel))"
                # println(string)
                # func = eval(string)
                # println("pass")
                # push!(tasks,Task(func))
                # println("pass")
                # println(summary(tasks[1]))
            end
            string = string * ")"
            println(string)
            # func =
            # println("pass====> ", summary(func))
            task = @spawn Meta.parse(string)
            push!(tasks,task)
        end
        modules_dict = Dict("id" => m.id, "functionid" => m.functionid, "channels" => channels)
        push!(modules_inputs, modules_dict)
    end

    for m in modules
        for connection in m.connections.inputs
            module_in = modules_inputs[m.id]
            channels = get(module_in,"channels", missing)
            if length(channels)>0
                channel = channels[connection.module_port]

                module_connected = modules_inputs[connection.module_id]
                module_connected_name = get(module_connected, "functionid", missing)
                string = "$(module_connected_name).$(module_connected_name)_f(ToUpercase_channel)"
                println(string)
                task = @spawn Meta.parse(string)
                println("pass")
                push!(tasks,task)
                println("pass")
                println(summary(tasks))
            end
        end
    end
    function run_tasks()
        for task in tasks
            println(summary(task))

            schedule(task,1)
        end
    end
    Task(run_tasks)
    println("Im running")
    # show(summary(ToUpercase.ToUpercase_f))
######################################3
    # include("FileReader.jl")
    #
    # include("ToUpercase.jl")
    # global ToUpercase_channel = Channel(1)
    task1 = Task(ToUpercase.ToUpercase_f(ToUpercase_channel))

    task2 = Task(FileReader.FileReader_f(ToUpercase_channel))

    # schedule(task1)
    # schedule(task2)

###################################33
    # show(summary(ToUpercase_f))

    #task2 = Task(include("FileReader.jl"))


    # println("==> summary: ",summary(task2))
    # println("333fetch----->",fetch(ToUpercase_channel))


    #task1 = Task(Func_ToUpercase)

    # yield()
    # yield(task1)
    # println(current_task())
    # yield(task2)
    # println(current_task())
    # yield()
    # println(current_task())
    # println(istaskdone(task2))

    # println(fetch(ToUpercase.ToUpercase_channel))

    # yield()
    println("end")

    #@async include("ToUpercase.jl")
    #run(ToUpercase)

    #run(FileReader)

end
