############################################
#   Functionality: Intakes 2 values, one from each port and outputs the sum.
function Addition_f(inPort1, inPort2, outPort1, variables)
    number1 = take!(inPort1)

    number2 = take!(inPort2)

    sum = parse(Int64 ,number1) + parse(Int64 ,number2)

    put!(outPort1, sum)
end
