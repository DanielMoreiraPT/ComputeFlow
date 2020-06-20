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
   end
end
function writeFileToProjectFile(path, text, separator)
    write(path, text)
    write(path, separator)

end

import Base.Threads
import Distributed


include("JsonReader.jl")

separatorInProjectFile = "\n###################\n"

projectName, modules = JsonReader.upload_modules("Computation/Aneta/Temperature_Calculations.json")

added_modules = Dict()

projectFile = open(projectName * ".jl", "w")
for m in modules
    if ! haskey(added_modules, m.functionid)
        println(m.functionid)
        code = readFile("Computation/Aneta/src/Modules/" * m.functionid*".jl")
        writeFileToProjectFile(projectFile, code, separatorInProjectFile)
        push!(added_modules, m.functionid => 1)
    end
end

writeFileToProjectFile(projectFile, "function $(projectName)_f()", "\n")

for m in modules
        for out in m.io.outputs
            createChannel = "\t$(out.channelName) = Channel{$(out.port_type)}(1)\n"
            writeFileToProjectFile(projectFile, createChannel, "\n")
        end
end

for m in modules
    functionCallString = """\t @async Task($(m.functionid)_f("""
    i = 0
    for connection in m.connections.inputs
        if i > 0
            functionCallString = functionCallString * ""","""
        end
        module_in = connection.module_id
        module_port = connection.module_port
        if (length(modules[module_in].io.outputs) < module_port)
            functionCallString = functionCallString * """None"""
        else
            functionCallString = functionCallString * """$(modules[module_in].io.outputs[module_port].channelName)"""
        end
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
    functionCallString = functionCallString * """"$(m.options)"))\n"""

    writeFileToProjectFile(projectFile, functionCallString, "\n")

end
writeFileToProjectFile(projectFile, "\nend\n $(projectName)_f()", "\n")

println("Im running")
close(projectFile)
