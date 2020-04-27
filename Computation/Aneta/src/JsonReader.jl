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


open("/home/anunia/Documents/ComputeFlow/Computation/Aneta/test.json","r") do jfile
    dataDict = JSON.parse(read(jfile,String))
    println(dataDict)

    modules = []
    for mod in get(dataDict,"Modules",missing)
        push!(modules, Module_data.creat_module(mod))
    end
    modules
end
end
    ### testing
    #println(get(get(dataDict,"Modules",missing)[1],"IO", missing))
    #println(get(get(dataDict,"Modules",missing)[1],"Coord", missing))
