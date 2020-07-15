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
# Flows/Simple.json
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

projectName, modules = JsonReader.upload_modules(ARGS[1])

added_modules = Dict()

mkdir(Computation Outputs\\"* projectName)
projectFile = open("Computation Outputs\\"* projectName *"\\" * projectName * ".jl", "w")
for m in modules
    if ! haskey(added_modules, m.name)
        println(m.name)
        code = readFile("C:\\Users\\Aneta\\github\\ComputeFlow\\Computation/src/Modules/" * m.name*".jl")
        writeFileToProjectFile(projectFile, code, separatorInProjectFile)
        push!(added_modules, m.name => 1)
    end
end
for m in modules
    if ! haskey(added_modules, m.name)
        println(m.variables)

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
    functionCallString = """\t @async Task($(m.name)_f("""
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
    functionCallString = functionCallString * """$(m.variables)))\n"""

    writeFileToProjectFile(projectFile, functionCallString, "\n")

end
writeFileToProjectFile(projectFile, "\nend\n $(projectName)_f()", "\n")

println("Im running")
close(projectFile)
