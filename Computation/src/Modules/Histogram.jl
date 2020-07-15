############################################
#   Functionality: Intakes data such as floats or integers and outputs a Histogram of that data.
using Plots
using Distributions

function Histogram_f(inPort1, outPort1, variables)
    y = fetch(inPort1)

    plot = histogram(y, fmt = :png)

    put!(outPort1, plot)
end
