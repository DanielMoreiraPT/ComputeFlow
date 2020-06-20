
############################################
#   Function counting mean of the numbers received by input Channel
#
import Statistics

function Mean_f(inPort1, outPort1, options)

    numbers = fetch(inPort1)

    middle = Statistics.middle(numbers)
    put!(outPort1, middle)
end
