using JSON

struct Options_GetNumber
    number
    Options_GetNumber(number) = new(number)
end
##########
function set_options_GetNumber(options)

    options = JSON.parse(read(options,String))
    number = get(options,"number",missing)

    Options_GetNumber(number)
end

############################################
#   MUTABLE part of module schema.
function GetNumber_f(outPort1, options)

    options = set_options_GetNumber(options)

    put!(outPort1, string(options.number))

end
