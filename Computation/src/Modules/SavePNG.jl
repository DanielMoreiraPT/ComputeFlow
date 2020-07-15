############################################
#   Functionality: Outputs a PNG file with recieved data
function SavePNG_f(inPort1, variables)
    fileName = get(variables, "file_name", missing)

    plot = fetch(inPort1)

    savefig(plot, fileName)
end
