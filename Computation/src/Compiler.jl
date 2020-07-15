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

function writeToProjectFile(path, text, separator)
    write(path, text)
    write(path, separator)
end

import Base.Threads
import Distributed


include("JsonReader.jl")

separatorInProjectFile = "\n###################\n"

# To run on IDE exchange the next two lines, ARGS for Terminal
# projectName, modules = JsonReader.upload_modules("Flows/Demo.json")
projectName, modules = JsonReader.upload_modules(ARGS[1])

added_modules = Dict()

# Innicializes the Project File in which the code will be written into
projectFile = open(projectName * ".jl", "w")

println("Fetching necessary Modules from Modules folder")
for m in modules
    if ! haskey(added_modules, m.name)
        println("\t↪ Fetching " * m.FunctionID * " module")
# This Path defines where it's retriving the Modules used in the Flow
        code = readFile("C:/Users/Dan/github/ComputeFlow/Computation/src/Modules/" * m.name *".jl")
        writeToProjectFile(projectFile, code, separatorInProjectFile)
        push!(added_modules, m.name => 1)
    end
end

# Debugging Code:
# Checking if all modules have been included in the Project File
for m in modules
    if ! haskey(added_modules, m.name)
        println(m.variables * "Function not found in the Project File, check if Module is present in the Module Folder")

    end
end

writeToProjectFile(projectFile, "function $(projectName)_f()", "\n")


# This function creates the necessary channels for the code to run while also allowing the code to validate Data types.
writeToProjectFile(projectFile, "\n# Channels necessary for code function, data types included", "\n")
writeToProjectFile(projectFile, "# If any error indicates any of these lines, most likely Data Validation failed", "\n")
for m in modules
        for out in m.io.outputs
            createChannel = "\t$(out.channelName) = Channel{$(out.port_type)}(1)\n"
            writeToProjectFile(projectFile, createChannel, "\n")
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

    writeToProjectFile(projectFile, functionCallString, "\n")

end
writeToProjectFile(projectFile, "\nend\n $(projectName)_f()", "\n")

println("Im running")
close(projectFile)
