################################################################################
#   Functionality: Intakes data such as floats or integers and outputs a plot
#   of that data
using Plots

function Plot_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = plot(y, fmt = :png)

    put!(outPort1, plt)
end
