 """
# module JsonReader

- Julia version:
- Author: anunia
- Date: 2020-04-20

# Examples

```jldoctest
julia>
```
"""
module JsonReader
    using JSON
    include("Module_data.jl")
#using Module_data
#"/home/anunia/Documents/ComputeFlow/Computation/test.json"
    function upload_modules(name)
        modules = []
        projectName = ""
        open(name,"r") do jfile
            dataDict = JSON.parse(read(jfile,String))
            projectName = get(dataDict,"title",missing)

            dataDictVar = JSON.parse(read("Computation/Options_files/$projectName.json",String))

            # println(dataDict)
            for mod in get(dataDict,"Modules",missing)
                push!(modules, Module_data.creat_module(mod,dataDictVar))
            end
        end

        projectName, modules
    end
end
    ### testing
    #println(get(get(dataDict,"Modules",missing)[1],"IO", missing))
    #println(get(get(dataDict,"Modules",missing)[1],"Coord", missing))
