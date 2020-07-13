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
#   Main function of the module
function FileReader_f(outPort1, variables)

    fileName = get(variables,"file_name",missing)

    text = read(fileName, String)

    put!(outPort1,text)
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
############################################
#   Function counting mean of the numbers received by input Channel
#   Receiving "end" finishes reading the numbers
function SavePNG_f(inPort1, variables)
    fileName = get(variables,"file_name",missing)

    plot = fetch(inPort1)

    savefig(plot, fileName)
end

###################
function NewProject_f()
	Average_2_0 = Channel{Float64}(1)

	ParseToFloat_3_0 = Channel{Array{Float64,1}}(1)

	FileReader_4_0 = Channel{String}(1)

	Plot_5_0 = Channel{Plot}(1)

	 @async Task(WriteToFile_f(Average_2_0,Dict{String,Any}()))

	 @async Task(Average_f(ParseToFloat_3_0,Average_2_0,Dict{String,Any}()))

	 @async Task(ParseToFloat_f(FileReader_4_0,ParseToFloat_3_0,Dict{String,Any}("file_name" => "Temperatures.txt")))

	 @async Task(FileReader_f(FileReader_4_0,Dict{String,Any}()))

	 @async Task(Plot_f(ParseToFloat_3_0,Plot_5_0,Dict{String,Any}("file_name" => "histogramSave.png")))

	 @async Task(SavePNG_f(Plot_5_0,missing))


end
 NewProject_f()
