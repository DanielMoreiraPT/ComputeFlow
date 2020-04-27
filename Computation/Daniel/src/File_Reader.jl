module  File_Reader
    using JSON
    include("To_Uppercase.jl")
    # UMMUTABLE  part of module schema.
    struct Function_Info
        name::String
        version::String
        id::UInt64

        Function_Info(name, version, id) = new(name, version, id)
    end

    struct Port_Info
        port_id
        port_type::String

        Port_Info(id, type) = new(id, type)
    end

    struct Input_Info
        name::String
        version::String
        id::UInt64
        port::Port_Info

        Input_Info(name, version, id, port) = new(name, version, id, port)
    end

    struct Output_Info
        name::String
        version::String
        id::UInt64
        port::Port_Info

        Output_Info(name, version, id, port) = new(name, version, id, port)
    end

    struct IO_Info
        inputs::Array{Port_Info, 1}
        outputs::Array{Port_Info, 1}

        IO_Info(input_array, output_array) = new(input_array, output_array)
    end

    fr_channel = Channel(1)

    # MUTABLE part of the module schema.

    FuncInfo = Function_Info("FileReader", "v.1.0.0",hash("FileReader"*"v.1.0.0"))
    ioInfo = nothing

    struct Options
        file_name::String

        Options(file_name) = new(file_name)
    end

    function Set_Options()
        name = "$(FuncInfo.id)_options.json"
        options = JSON.parse(read(name, String))

        file_name = get(options, "file_name", missing)
        Options(file_name)
    end

    println("filr+++", FuncInfo)

    options = Set_Options()
    text = read(options.file_name, String)
    put!(To_Uppercase.uc_channel, text)
end
