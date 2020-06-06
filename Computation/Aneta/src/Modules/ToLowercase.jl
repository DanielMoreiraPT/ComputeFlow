module ToLowercase
    using JSON

    struct Options_ToLowercase_f
        file_name::String
        Options_ToLowercase_f(file_name) = new(file_name)
    end
##########
    function set_options_ToLowercase_f()
        name = "Computation/Aneta/ToLowercase_options.json"

        options = JSON.parse(read(name,String))
        file_name = get(options,"file_name",missing)

        Options_ToLowercase_f(file_name)
    end


############################################
    #   MUTABLE part of module schema.
    function ToLowercase_f(inputs_p, outputs_p)

        options = set_options_ToLowercase()

        text = take!(inputs_p[1])
        lowercase(text)

        put!(outputs_p[1], text)
    end
end
