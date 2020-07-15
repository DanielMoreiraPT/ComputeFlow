############################################
#   Main function of the module
function FileReader_f(outPort1; fileName)
	println("Path" )

    #fileName = get(variables,"file_name",missing)

	#Debugging
	println("Path" * fileName)

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
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function SavePNG_f(inPort1, variables)
    fileName = get(variables,"file_name",missing)

    plot = fetch(inPort1)

    savefig(plot, fileName)
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

############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
using Plots

function Plot_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = plot(y,fmt = :png)

    put!(outPort1, plt)
end

###################
function NewProject_f(Path)
	FileReader_1_0 = Channel{String}(1)

	ParseToFloat_2_0 = Channel{Array{Float64,1}}(1)

	Average_3_0 = Channel{Float64}(1)

	Plot_6_0 = Channel{Plots.Plot{Plots.GRBackend}}(1)
	println("Path" * Path)

	 @async Task(FileReader_f(FileReader_1_0;fileName = "$Path/Temperatures.txt"))

	 @async Task(ParseToFloat_f(FileReader_1_0,ParseToFloat_2_0,Dict{String,Any}()))

	 @async Task(Average_f(ParseToFloat_2_0,Average_3_0,Dict{String,Any}()))

	 @async Task(SavePNG_f(Plot_6_0,Dict{String,Any}("file_name" => "$Path/image.png")))

	 @async Task(WriteToFile_f(Average_3_0,Dict{String,Any}("file_name" => "$Path/text.txt")))

	 @async Task(Plot_f(ParseToFloat_2_0,Plot_6_0,Dict{String,Any}()))


end
Path = ARGS[1]
 NewProject_f(Path)
