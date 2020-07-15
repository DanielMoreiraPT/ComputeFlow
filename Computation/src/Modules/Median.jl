################################################################################
#   Functionality: Intakes Array of floats, calculates Median of those floats,
#    outputs AVG as single float.
import Statistics

function Median_f(inPort1, outPort1, variables)

    numbers = fetch(inPort1)

    middle = Statistics.middle(numbers)
    put!(outPort1, middle)
end
