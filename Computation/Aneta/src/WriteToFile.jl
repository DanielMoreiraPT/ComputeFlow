module WriteToFile
    using JSON

    struct Function_info
        name::String
        version::String
        id::UInt64
        Function_info(name, verion, id) =
            new(name, verion, id)
    end
    func_info = Function_info("WriteToFile", "v.1.0.0",hash("WriteToFile"*"v.1.0.0"))

    struct Options
        file_name::String
        Options(file_name) = new(file_name)
    end
##########
    function set_options()
        name = "Computation/Aneta/$(func_info.id)_options.json"
        options = JSON.parse(read(name,String))
        file_name = get(options,"file_name",missing)
        Options(file_name)
    end

    function get_text(channel)
        txt = take!(channel)
        return txt
    end

############################################
    #   MUTABLE part of module schema.
    function WriteToFile_f(inputs_p, outputs_p)

        options = set_options()

        text = get_text(inputs_p[1])
        write(options.file_name, text)

    end
end
