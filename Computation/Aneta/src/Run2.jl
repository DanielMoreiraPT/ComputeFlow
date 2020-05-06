"""
# module Run2

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""
module Run2
    import Base.Threads
    import Distributed
    include("JsonReader.jl")


    modules = JsonReader.upload_modules("Computation/Aneta/ToUppercase_test.json")

    modules_dict = Dict()
    modules_info = Dict()
    tasks = []

    for m in modules
        include(m.functionid*".jl")
        in_channels = Dict()
        out_channels = Dict()

            for io in m.io.outputs
                # channel = Channel(1)
                out_channels[io.port_id] = io.channel
            end
            for connection in m.connections.inputs
                module_in = connection.module_id
                module_port = connection.module_port
                input_port = connection.input_port
                in_channels[input_port] = modules[module_in].io.outputs[module_port].channel
            end
        modules_dict = Dict("functionid" => m.functionid,"input_channels" => in_channels, "output_channels" => out_channels)
        modules_info[m.id] = modules_dict
        string = """$(m.functionid).$(m.functionid)_f(modules_info[$(m.id)]["input_channels"], modules_info[$(m.id)]["output_channels"])"""
        string2 = """$(m.functionid).$(m.functionid)_f($(modules_info[(m.id)]["input_channels"]), modules_info[$(m.id)]["output_channels"])"""
        println("----->",string2)
        push!(tasks,@task (eval(Meta.parse(string))))

    end
    for task in tasks
        schedule( task)
    end

    println("Im running")


end
