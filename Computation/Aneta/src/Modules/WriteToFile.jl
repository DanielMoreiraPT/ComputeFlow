module WriteToFile
    using JSON

    struct Options_WriteToFile
        file_name::String
        Options_WriteToFile(file_name) = new(file_name)
    end
##########
    function set_options_WriteToFile()
        name = "Computation/Aneta/WriteToFile_options.json"
        options = JSON.parse(read(name,String))
        file_name = get(options,"file_name",missing)
        Options_WriteToFile(file_name)
    end


############################################
    #   MUTABLE part of module schema.
    function WriteToFile_f(inputs_p, outputs_p, options)
        options = set_options_WriteToFile()
        text = take!(inputs_p[1])
        println(text)

        open(options.file_name, "w") do f
            write(f, string(text))
        end
    end
end
