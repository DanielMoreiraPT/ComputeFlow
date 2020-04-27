"""
    Func_FileReader()

- Julia version:
- Author: anunia
- Date: 2020-04-27

# Arguments

# Examples

```jldoctest
julia>
```
"""


    #include("ToUpercase2.jl")
    #using ToUpercase

    ################################################
#   UNMUTABLE part of module schema.
    struct Function_info
        name::String
        version::String
        id::UInt64
        Function_info(name, verion, id) =
            new(name, verion, id)
    end

    struct Port_info
        port_id
        port_type::String
        Port_info(id, type) = new(id, type)
    end

    struct InputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        InputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct OutputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        OurputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct IOinfo
        inputs::Array{Port_info, 1}
        outputs::Array{Port_info, 1}
        IOinfo(input_array, output_array) = new(input_array, output_array)
    end

    struct Options_FileReader
        file_name::String
        Options_FileReader(file_name) = new(file_name)
    end

    function set_options()
        #/home/anunia/Documents/ComputeFlow/Computation/Aneta/6480418423639474263_options.json
        name = "/home/anunia/Documents/ComputeFlow/Computation/Aneta/$(func_info.id)_options.json"
        options = JSON.parse(read(name,String))

        file_name = get(options,"file_name",missing)
        Options_FileReader("/home/anunia/Documents/ComputeFlow/Computation/Aneta/"*file_name)
    end
############################################
#   MUTABLE part of module schema.
#include("ToUpercase.jl")

function Func_FileReader()

    FileReader_chanel = Channel(1)

    func_info = Function_info("FileReader", "v.1.0.0",hash("FileReader"*"v.1.0.0"))
    ioinfo = nothing


    println("filr+++" , func_info)

    options = set_options()
    text = read(options.file_name, String)
    println(text)
    #include("ToUpercase.jl")
    put!(Func_ToUpercase.get_channel(),text)

end
