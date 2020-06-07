"""

# module Compiler

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""
function readFile(path)
    open(path, "r") do io
       read(io)
   end;
end
function writeFileToProjectFile(path, text, separator)
    write(path, text)
    write(path, separator)

end

import Base.Threads
import Distributed


include("JsonReader.jl")

separatorInProjectFile = "\n###################\n"

projectName, modules = JsonReader.upload_modules("Computation/Aneta/ToUppercase_test.json")

# modules_dict = Dict()
# modules_info = Dict()
# tasks = []
# added_modules = Dict()

projectFile = open(projectName * ".jl", "w")
for m in modules
    if ! haskey(added_modules, m.functionid)
        code = readFile("Computation/Aneta/src/Modules/" * m.functionid*".jl")
        writeFileToProjectFile(projectFile, code, separatorInProjectFile)
    end
end

writeFileToProjectFile(projectFile, "function $(projectName)_f()", "\n")

for m in modules
        for out in m.io.outputs
            createChannel = "$(out.channelName) = Channel(1)\n"
            writeFileToProjectFile(projectFile, createChannel, "\n")
        end
end

for m in modules
    in_channels = Dict()
    out_channels = Dict()
    functionCallString = """\t$(m.functionid)_f("""
    i = 0
    for connection in m.connections.inputs
        if i > 0
            functionCallString = functionCallString * ""","""
        end
        module_in = connection.module_id
        module_port = connection.module_port
        # input_port = connection.input_port
        # in_channels[input_port] = modules[module_in].io.outputs[module_port].channelName

        functionCallString = functionCallString * """$(modules[module_in].io.outputs[module_port].channelName)"""
        i = i + 1
    end

    for out in m.io.outputs
        if i > 0
            (functionCallString = functionCallString * """,""")
        end
        functionCallString *= """$(out.channelName)"""
        i = i + 1
    end
    if i > 0
        (functionCallString = functionCallString * """,""")
    end
    functionCallString = functionCallString * """"$(m.options)")\n"""

    # modules_dict = Dict("functionid" => m.functionid,"input_channels" => in_channels, "output_channels" => out_channels)
    # modules_info[m.id] = modules_dict
    # string = """$(m.functionid).$(m.functionid)_f(modules_info[$(m.id)]["input_channels"], modules_info[$(m.id)]["output_channels"])"""
    # push!(tasks,@task (eval(Meta.parse(string))))
    writeFileToProjectFile(projectFile, functionCallString, "\n")

end
writeFileToProjectFile(projectFile, "\nend", "\n")

for task in tasks
    schedule( task)
end

println("Im running")
close(projectFile)
