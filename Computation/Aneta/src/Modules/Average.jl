
############################################
#   Function counting Average of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function Average_f(inPort1, outPort1, options)

    sum = 0
    numberOfInputs = 0

    input = take!(inPort1)

    while input != "end"
        sum += input;
        numberOfInputs += 1
        input = take!(inPort1)
    end


    avr = sum / numberOfInputs

    put!(outPort1, avr)
end
