############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
struct Options_SavePNG
    file_name::String
    Options_SavePNG(file_name) = new(file_name)
end
##########
function set_options_SavePNG(options)
    options = JSON.parse(read(options,String))
    file_name = get(options,"file_name",missing)
    Options_SavePNG(file_name)
end

function SavePNG_f(inPort1, options)
    options = set_options_SavePNG(options)

    plot = fetch(inPort1)

    savefig(plot, options.file_name)
end
