module JsonReader
    using JSON
    include("ModuleData.jl")
#using Module_data
#"/home/anunia/Documents/ComputeFlow/Computation/test.json"
    function uploadModules(name)
        modules = []
        projectName = ""
        open(name,"r") do jfile
            dataDict = JSON.parse(read(jfile, String))
            projectName = get(dataDict, "title", missing)


        # dataDictVar = JSON.parse(read("Computation/Options_files/$projectName.json",String))

            # println(dataDict)
            for mod in get(dataDict, "Modules", missing)
                push!(modules, ModuleData.createModule(mod))
            end
        end

        projectName, modules
    end
end
    ### testing
    #println(get(get(dataDict,"Modules",missing)[1],"IO", missing))
    #println(get(get(dataDict,"Modules",missing)[1],"Coord", missing))
