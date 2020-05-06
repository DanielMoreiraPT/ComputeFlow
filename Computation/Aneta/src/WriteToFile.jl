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
    println(func_info.id)
    struct Options
        file_name::String
        Options(file_name) = new(file_name)
    end
##########
    function set_options()
        #/home/anunia/Documents/ComputeFlow/Computation/Aneta/6480418423639474263_options.json
        name = "Computation/Aneta/$(func_info.id)_options.json"
        options = JSON.parse(read(name,String))
        println(name)
        file_name = get(options,"file_name",missing)
        Options(file_name)
    end

    function get_text(channel)
        txt = take!(channel)
        return txt
    end
    #FileReader_chanel = Channel(1)
    ############################################
    #   MUTABLE part of module schema.
    function WriteToFile_f(inputs_p, outputs_p)

        options = set_options()
        # text = read(options.file_name, String)
        println("------wwwwwwwwwwwwwww-\n",inputs_p)
        # # include("ToUpercase.jl")
        # println("================================>",inputs_p,"\n", outputs_p,"================================>")
        # println(inputs_p[1])
        text = get_text(inputs_p[1])
        write(options.file_name, text)
        # fetch(inputs_p[1])
        println("----WriteToFile----\n",options.file_name)
    end
end
