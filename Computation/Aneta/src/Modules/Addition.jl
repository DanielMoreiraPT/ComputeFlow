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
function Addition_f(inPort1, inPort2, outPort1, options)

    # options = set_options_Addition()
    number1 = take!(inPort1)

    number2 = take!(inPort2)

    sum = parse(Int64 ,number1) + parse(Int64 ,number2)

    put!(outPort1, sum)
end
