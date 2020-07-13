############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function SavePNG_f(inPort1, variables)
    fileName = get(variables,"file_name",missing)

    plot = fetch(inPort1)

    savefig(plot, fileName)
end
