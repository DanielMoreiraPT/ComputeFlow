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
    import Base.Threads
    import Distributed
    include("JsonReader.jl")


    modules = JsonReader.upload_modules("Computation/Aneta/ToUppercase_test.json")

    modules_dict = Dict()
    modules_output_info = Dict()
    tasks = []

    global ToUpercase_channel = Channel(1)

    for m in modules
        include(m.functionid*".jl")
        channels = Dict()
        # push!(modules_inputs, channels)
        # if length(m.io.outputs) > 0
        #     # string = "$(m.functionid).$(m.functionid)_f("

            for io in m.io.outputs
                channel = Channel(1)
                channels[io.port_id] = channel
                # string = string * "$channel"
                # push!(channels,channel)
                #println(summary(modules_inputs[m.id][]))
                # string = "$(m.functionid).$(m.functionid)_f($(channel))"
                # println(string)
                # func = eval(string)
                # println("pass")
                # push!(tasks,Task(func))
                # println("pass")
                # println(summary(tasks[1]))
            end
            # string = string * ")"

            # task = @async Task(eval(Meta.parse(string)))
            # push!(tasks,task)
        # end
        modules_dict = Dict("functionid" => m.functionid, "output_channels" => channels)
        # push!(modules_inputs, modules_dict)
        modules_output_info[m.id] = modules_dict
    end
    inputs_info_dict = Dict()
    println(modules_output_info)
    for m in modules
        # if length(m.connections.inputs)>0
            # string = ""
            inputs = Dict()
            for connection in m.connections.inputs
                module_in = connection.module_id
                module_port = connection.module_port
                input_port = connection.input_port
                # channels = get(module_in,"channels", missing)
                # println("--->",connection.module_port)
                # println("--->",modules_output_info[module_in]["output_channels"])

                inputs[input_port] = modules_output_info[module_in]["output_channels"][module_port]
                # if length(channels)>0
                #     channel = channels[connection.module_port]
                #
                #     module_connected = modules_inputs[connection.module_id]
                #     module_connected_name = get(module_connected, "functionid", missing)
                #     string = "$(module_connected_name).$(module_connected_name)_f(ToUpercase_channel)"
                #     println(string)
                #     task = @async Task(eval(Meta.parse(string)))
                #     println("pass")
                #     push!(tasks,task)
                #     println("pass")
                #     println(summary(tasks))
                # end
            end
            # inp = []
            # push!(inp,inputs)
            # out = []
            # push!(out,)
            inputs_info_dict[m.id] = inputs
            # println("---------------\n",inputs)
            outputs = modules_output_info[m.id]["output_channels"]
            # println(outputs)
            # string = """$(m.functionid).$(m.functionid)_f(inputs, outputs)"""
            # data = ("inputs" => inputs, "outputs" => outputs)
            # println("""$(m.functionid).$(m.functionid)_f($inputs, $outputs)""")
            # println(string,"\n---------------")
            # # func = Meta.parse(string)
            # # println(func)
            # # task = @async Task(eval(Meta.parse(string)))
            # push!(tasks,@async Task(eval(Meta.parse(string))))
        # end
    end
    i = 1
    task = Any
    while i <= length(modules)
        m = modules[i]
        outputs = modules_output_info[m.id]["output_channels"]
        inputs = inputs_info_dict[m.id]
        string = """$(m.functionid).$(m.functionid)_f(inputs, outputs)"""
        data = ("inputs" => inputs, "outputs" => outputs)
        println("""$(m.functionid).$(m.functionid)_f($inputs, $outputs)""")
        println(string,"\n---------------")
        # func = Meta.parse(string)
        # println(func)
        global task = Threads.@async Task(eval(Meta.parse(string)))
        push!(tasks,@task (eval(Meta.parse(string))))
        global i = i + 1
    end
    for task in tasks
        schedule( task)
    end
        # m = modules[1]
        # outputs = modules_output_info[m.id]["output_channels"]
        # inputs = inputs_info_dict[m.id]
        # string = """$(m.functionid).$(m.functionid)_f(inputs, outputs)"""
        # data = ("inputs" => inputs, "outputs" => outputs)
        # println("""$(m.functionid).$(m.functionid)_f($inputs, $outputs)""")
        # println(string,"\n---------------")
        # # func = Meta.parse(string)
        # # println(func)
        # # task = @async Task(eval(Meta.parse(string)))
        # push!(tasks,@async Task(eval(Meta.parse(string))))

    # @async Task(wait(1000))
    channel = Channel(1)
    inputs = Dict()
    inputs[1] = channel
    outputs = Dict()

    # string = """ToUpercase.ToUpercase_f(inputs, outputs)"""
    # println(string)
    # println(inputs,"\n", outputs)
    #
    # task1 = @async Task(eval(Meta.parse(string)))
    # # end

    # while true
    # end

    # include("FileReader.jl")
    #
    # include("ToUpercase.jl")
    # global ToUpercase_channel = Channel(1)
    # task1 = @async Task(ToUpercase.ToUpercase_f(ToUpercase_channel))
    #
    # task2 = @async Task(FileReader.FileReader_f(ToUpercase_channel))
    #
    println("Im running")

######################################3
    # include("FileReader.jl")
    #
    # include("ToUpercase.jl")
    # global ToUpercase_channel = Channel(1)
    # string = "FileReader.FileReader_f(ToUpercase_channel)"
    # string2= "ToUpercase.ToUpercase_f(ToUpercase_channel)"
    # task1 = @async Task(eval(Meta.parse(string2)))

end
