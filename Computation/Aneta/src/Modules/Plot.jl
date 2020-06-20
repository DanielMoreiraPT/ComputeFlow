
############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
using Plots

function Plot_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = plot(y,fmt = :png)
    # savefig(plt,"plot.png")

    put!(outPort1, plt)
end
