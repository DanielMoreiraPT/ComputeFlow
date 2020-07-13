############################################
#   MUTABLE part of module schema.
function Addition_f(inPort1, inPort2, outPort1, variables)
    number1 = take!(inPort1)

    number2 = take!(inPort2)

    sum = parse(Int64 ,number1) + parse(Int64 ,number2)

    put!(outPort1, sum)
end

###################
############################################
#   MUTABLE part of module schema.
function GetNumber_f(outPort1, variables)
    number = get(variables,"number",0)

    println(number)
    put!(outPort1, number)

end

###################
############################################
#   MUTABLE part of module schema.
function WriteToFile_f(inPort1, variables)
    text = take!(inPort1)

    fileName = get(variables,"file_name",missing)
    open(fileName, "w") do f
        write(f, string(text))
    end
end

###################
function Math_f()
	Addition_1_0 = Channel{Int64}(1)

	GetNumber_2_0 = Channel{Int64}(1)

	GetNumber_3_0 = Channel{Int64}(1)

	 @async Task(Addition_f(GetNumber_2_0,GetNumber_3_0,Addition_1_0,Dict{String,Any}()))

	 @async Task(GetNumber_f(GetNumber_2_0,Dict{String,Any}("number" => 145)))

	 @async Task(GetNumber_f(GetNumber_3_0,Dict{String,Any}("number" => 200)))

	 @async Task(WriteToFile_f(Addition_1_0,Dict{String,Any}("file_name" => "mathOutput.txt")))


end
 Math_f()


function name(;a, b)
	println(a)
	return a +b
end
c = name(b = 5, a = 6)
println(c)
