################################################################################
#   Functionality: Intakes Array of floats, calculates AVG of those floats,
#   outputs AVG as single float.
function AverageFloat_f(inPort1, outPort1, variables)

    sum = 0
    numbers = fetch(inPort1)

    for number in numbers
        sum += number
    end

    avr = sum / length(numbers)

    put!(outPort1, avr)
end
