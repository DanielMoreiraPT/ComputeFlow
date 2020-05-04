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
            for io in m.io.outputs
                channel = Channel(1)
                channels[io.port_id] = channel
            end
        modules_dict = Dict("functionid" => m.functionid, "output_channels" => channels)
        modules_output_info[m.id] = modules_dict
    end
    inputs_info_dict = Dict()
    println(modules_output_info)
    for m in modules
            inputs = Dict()
            for connection in m.connections.inputs
                module_in = connection.module_id
                module_port = connection.module_port
                input_port = connection.input_port
                inputs[input_port] = modules_output_info[module_in]["output_channels"][module_port]
            end
            inputs_info_dict[m.id] = inputs
            outputs = modules_output_info[m.id]["output_channels"]

    end
    i = 1

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
        # global task = Threads.@async Task(eval(Meta.parse(string)))
        push!(tasks,@task (eval(Meta.parse(string))))
        global i = i + 1
    end
    for task in tasks
        schedule( task)
    end
########
    # for some reason this code must be here
    channel = Channel(1)
    inputs = Dict()
    inputs[1] = channel
    outputs = Dict()

    println("Im running")


end
