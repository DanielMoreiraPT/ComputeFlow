############################################
#   MUTABLE part of module schema.
function WriteToFile_f(inPort1, variables)
    text = take!(inPort1)

    fileName = get(variables,"file_name",missing)

    open(fileName, "w") do f
        write(f, string(text))
    end
end
