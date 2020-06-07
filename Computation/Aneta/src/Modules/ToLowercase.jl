using JSON

struct Options_ToLowercase_f
    file_name::String
    Options_ToLowercase_f(file_name) = new(file_name)
end
##########
function set_options_ToLowercase_f(options)
    options = JSON.parse(read(options,String))
    file_name = get(options,"file_name",missing)

    Options_ToLowercase_f(file_name)
end


############################################
#   MUTABLE part of module schema.
function ToLowercase_f(inPort1, outPort1, options)

    options = set_options_ToLowercase(options)

    text = take!(inPort1)
    lowercase(text)

    put!(outPort1, text)
end
