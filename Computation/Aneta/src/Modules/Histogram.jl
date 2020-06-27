############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
using Plots
using Distributions

function Histogram_f(inPort1, outPort1, variables)
    y = fetch(inPort1)

    plt = histogram(y,fmt = :png)

    put!(outPort1, plt)
end
