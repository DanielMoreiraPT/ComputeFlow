module Addition
    using JSON

    struct Options_Addition
        Options_Addition() = new()
    end
##########
    function set_options_Addition()
        name = "Computation/Aneta/Addition_options.json"

        options = JSON.parse(read(name,String))

        Options_Addition()
    end


############################################
    #   MUTABLE part of module schema.
    function Addition_f(inputs_p, outputs_p, options)

        # options = set_options_Addition()
        number1 = take!(inputs_p[1])

        number2 = take!(inputs_p[2])

        sum = parse(Int64 ,number1) + parse(Int64 ,number2)

        put!(outputs_p[1], sum)
    end
end
