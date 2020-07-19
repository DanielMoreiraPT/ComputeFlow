import Base.Threads
import Distributed

include("JsonReader.jl")

function readFile(path)
    open(path, "r") do io
       read(io)
   end
end

function writeToProjectFile(path, text, separator)
    write(path, text)
    write(path, separator)
end

path = @__DIR__

flowsFolder = split(path, "Computation\\")[1] * "Flows\\"
# To run on IDE exchange the next two lines, ARGS for Terminal
# projectName, modules = JsonReader.uploadModules("Flows/Demo.json")
projectName, modules = JsonReader.uploadModules(flowsFolder * ARGS[1])

addedModules = Dict()

# Innicializes the Project File in which the code will be written into
outputFolder = split(path, "Computation\\")[1] * "Computation_Outputs\\"
projectFile = open(outputFolder * ARGS[2] * ".jl", "w")

writeToProjectFile(projectFile, "################################ IMPORTED MODULES ##############################", "\n")
println("\nFetching necessary Modules from Modules folder\n")
for m in modules
    if ! haskey(addedModules, m.name)
        println("\t↪ Fetching Module: " * m.name)
        # This Path defines where it's retriving the Modules used in the Flow
        moduleCode = readFile(path * "/Modules/" * m.functionid * ".jl")
        writeToProjectFile(projectFile, moduleCode, "\n")
        push!(addedModules, m.name => 1)
    end
end

    # Debugging Code:
    # Checking if all modules have been included in the Project File
for m in modules
    if ! haskey(addedModules, m.name)
        println(m.variables * "Function not found in the Project File, check if Module is present in the Module Folder")

    end
end
println("\nStarting Function creation\n")
writeToProjectFile(projectFile, "function $(projectName)_f()", "\n")


    # This function creates the necessary channels for the code to run while also
    # allowing the code to validate Data types.
writeToProjectFile(projectFile, "\n# Channels necessary for code function, data types included", "\n")
writeToProjectFile(projectFile, "# If any error indicates any of these lines, most likely Data Validation failed", "\n")

println("Creating necessary output Channels\n")
for m in modules
    if length(m.io.outputs) >= 1
        println("\t↪ Creating channel for ID: $(m.id)\tModule: " * m.name)
    end
    for out in m.io.outputs
        println("\t\t↪ Port - $(out.port_id)")
        createChannel = "\t$(out.channelName) = Channel{$(out.port_type)}(1)\n"
        writeToProjectFile(projectFile, createChannel, "\n")
    end
end

println("\nCreating necessary Tasks\n")

writeToProjectFile(projectFile, "################################################################################", "\n")
writeToProjectFile(projectFile, """# Exchange "CHANGE ME" for either the file name within the same folder or""", "\n")
writeToProjectFile(projectFile, """# full path to file""", "\n\n")

for m in modules
    println("\t↪ Creating task for Module: " * m.name)
    functionCallString = """\tt$(m.id) = @async Task($(m.functionid)_f("""
    i = 0
    for connection in m.connections.inputs
        if i > 0
            functionCallString = functionCallString * """, """
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
            (functionCallString = functionCallString * """, """)
        end
        functionCallString *= """$(out.channelName)"""
        i = i + 1
    end
    if i > 0
        (functionCallString = functionCallString * """, """)
    end
    functionCallString = functionCallString * """$(m.variables)))"""

    writeToProjectFile(projectFile, functionCallString, "\n")
    writeToProjectFile(projectFile, "\twait(t$(m.id))", "\n\n")

end
writeToProjectFile(projectFile, "\nend\n $(projectName)_f()", "\n\n")

println("\nCompilation concluded check your destination folder: "* outputFolder *"\n\n")
close(projectFile)
