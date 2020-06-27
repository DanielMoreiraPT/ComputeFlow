############################################
#   MUTABLE part of module schema.
function Addition_f(inPort1, inPort2, outPort1, variables)
    number1 = take!(inPort1)

    number2 = take!(inPort2)

    sum = parse(Int64 ,number1) + parse(Int64 ,number2)

    put!(outPort1, sum)
end
