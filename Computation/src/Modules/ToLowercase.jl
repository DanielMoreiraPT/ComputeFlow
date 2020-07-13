############################################
#   MUTABLE part of module schema.
function ToLowercase_f(inPort1, outPort1, variables)
    text = take!(inPort1)
    lowercase(text)

    put!(outPort1, text)
end
