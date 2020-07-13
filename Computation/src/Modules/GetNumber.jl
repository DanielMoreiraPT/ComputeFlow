############################################
#   MUTABLE part of module schema.
function GetNumber_f(outPort1, variables)
    number = get(variables,"number",0)

    put!(outPort1, number)

end
