module GetNumber
    using JSON

    struct Options_GetNumber
        file_name::String
        Options_GetNumber(file_name) = new(file_name)
    end
##########
    function set_options_GetNumber()
        name = "Computation/Aneta/Addition_options.json"

        options = JSON.parse(read(name,String))
        file_name = get(options,"file_name",missing)

        Options_GetNumber(file_name)
    end


############################################
    #   MUTABLE part of module schema.
    function GetNumber_f(inputs_p, outputs_p)

        # options = set_options_GetNumber()


        number = "553"
        sum = 555 + 1

        # number = parse(Int64 ,number)
        # println(summary(number))
        put!(outputs_p[1], number)

        # println("here--------")
        # println(fetch(outputs_p[1]))


    end
end
