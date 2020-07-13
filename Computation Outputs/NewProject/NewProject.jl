############################################
#   Main function of the module
function FileReader_f(outPort1, variables)

    fileName = get(variables,"file_name",missing)

    text = read(fileName, String)

    put!(outPort1,text)
end

###################
############################################
#   Function counting mean of the numbers received by input Channel
#
function ParseToFloat_f(inPort1, outPort1, variables)
    text = fetch(inPort1)

    splitedText = split(text, r"\n| ",keepempty=false)
    numbers = []

    for txt in splitedText
        number = parse(Float64, txt)
        push!(numbers, number)

    end

    put!(outPort1, numbers)


end

###################

############################################
#   Function counting Average of the numbers received by input Channel
#
function Average_f(inPort1, outPort1, variables)

    sum = 0
    numbers = fetch(inPort1)

    for number in numbers
        sum += number
    end

    avr = sum / length(numbers)

    put!(outPort1, avr)
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
function NewProject_f()
	FileReader_1_0 = Channel{String}(1)

	ParseToFloat_2_0 = Channel{Array{Float64,1}}(1)

	Average_3_0 = Channel{Float64}(1)

	 @async Task(FileReader_f(FileReader_1_0,Dict{String,Any}("file_name" => "Computation Outputs\\NewProject\\Temperatures.txt")))

	 @async Task(ParseToFloat_f(FileReader_1_0,ParseToFloat_2_0,Dict{String,Any}()))

	 @async Task(Average_f(ParseToFloat_2_0,Average_3_0,Dict{String,Any}()))

	 @async Task(WriteToFile_f(Average_3_0,Dict{String,Any}("file_name" => "Computation Outputs\\NewProject\\avg.txt")))


end
 NewProject_f()
