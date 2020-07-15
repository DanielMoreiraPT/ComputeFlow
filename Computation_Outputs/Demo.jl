#################################IMPORTED MODULES###############################
################################################################################
#   Functionality: outputs file data as text.
function FileReader_f(outPort1, variables)

    fileName = get(variables,"file_name", missing)

    text = read(fileName, String)

    put!(outPort1,text)
end

################################################################################
#   Function counting mean of the numbers received by input Channel
function ParseToFloat_f(inPort1, outPort1, variables)
    text = fetch(inPort1)

    splitedText = split(text, r"\n| ", keepempty = false)
    numbers = []

    for txt in splitedText
        number = parse(Float64, txt)
        push!(numbers, number)

    end

    put!(outPort1, numbers)


end

################################################################################
#   Functionality: Intakes Array of floats, calculates AVG of those floats,
#   outputs AVG as single float.
function AverageFloat_f(inPort1, outPort1, variables)

    sum = 0
    numbers = fetch(inPort1)

    for number in numbers
        sum += number
    end

    avr = sum / length(numbers)

    put!(outPort1, avr)
end

################################################################################
#   Functionality: Intakes any type of data and outputs a file with it.
function WriteToFile_f(inPort1, variables)
    text = take!(inPort1)

    fileName = get(variables, "file_name", missing)

    open(fileName, "w") do f
        write(f, string(text))
    end
end

################################################################################
#   Functionality: Intakes data such as floats or integers and outputs a plot
#   of that data
using Plots

function Plot_f(inPort1, outPort1, options)
    y = fetch(inPort1)

    plt = plot(y, fmt = :png)

    put!(outPort1, plt)
end

################################################################################
#   Functionality: Outputs a PNG file with recieved data
function SavePNG_f(inPort1, variables)
    fileName = get(variables, "file_name", missing)

    plt = fetch(inPort1)

    savefig(plt, fileName)
end

function NewProject_f()

# Channels necessary for code function, data types included
# If any error indicates any of these lines, most likely Data Validation failed
	FileReader_1_0 = Channel{String}(1)

	ParseToFloat_2_0 = Channel{Array{Float64,1}}(1)

	AverageFloat_3_0 = Channel{Float64}(1)

	Plot_5_0 = Channel{Plots.Plot{Plots.GRBackend}}(1)

	@async Task(FileReader_f(FileReader_1_0, Dict{String,Any}("file_name" => "C:\\Users\\Dan\\github\\ComputeFlow\\Computation_Outputs\\Temperatures.txt")))

	@async Task(ParseToFloat_f(FileReader_1_0, ParseToFloat_2_0, Dict{String,Any}()))

	@async Task(AverageFloat_f(ParseToFloat_2_0, AverageFloat_3_0, Dict{String,Any}()))

	@async Task(WriteToFile_f(AverageFloat_3_0, Dict{String,Any}("file_name" => "C:\\Users\\Dan\\github\\ComputeFlow\\Computation_Outputs\\AVGTemp.txt")))

	@async Task(Plot_f(ParseToFloat_2_0, Plot_5_0, Dict{String,Any}()))

	@async Task(SavePNG_f(Plot_5_0, Dict{String,Any}("file_name" => "C:\\Users\\Dan\\github\\ComputeFlow\\Computation_Outputs\\TempPlot.png")))


end
 NewProject_f()
