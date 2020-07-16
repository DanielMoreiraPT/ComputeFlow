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
#   Functionality: Intakes Array of floats, calculates Median of those floats,
#    outputs AVG as single float.
import Statistics

function Median_f(inPort1, outPort1, variables)

    numbers = fetch(inPort1)

    middle = Statistics.middle(numbers)
    put!(outPort1, middle)
end

################################################################################
#   Functionality: Intakes data such as floats or integers and outputs a
#   Histogram of that data.
using Plots
using Distributions

function Histogram_f(inPort1, outPort1, variables)
    y = fetch(inPort1)

    plot = histogram(y, fmt = :png)

    put!(outPort1, plot)
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

################################################################################
#   Functionality: Intakes any type of data and outputs a file with it.
function WriteToFile_f(inPort1, variables)
    text = take!(inPort1)

    fileName = get(variables, "file_name", missing)

    open(fileName, "w") do f
        write(f, string(text))
    end
end

function NewProject_f()

# Channels necessary for code function, data types included
# If any error indicates any of these lines, most likely Data Validation failed
	FileReader_1_0 = Channel{String}(1)

	ParseToFloat_2_0 = Channel{Array{Float64,1}}(1)

	AverageFloat_3_0 = Channel{Float64}(1)

	Median_4_0 = Channel{Float64}(1)

	Histogram_5_0 = Channel{Plots.Plot{Plots.GRBackend}}(1)

	Plot_6_0 = Channel{Plots.Plot{Plots.GRBackend}}(1)

################################################################################
# Exchange "CHANGE ME" for either the file name within the same folder or
# full path to file

	t1 = @async Task(FileReader_f(FileReader_1_0, Dict{String,Any}("file_name" => "Temperatures.txt")))
	wait(t1)

	t2 = @async Task(ParseToFloat_f(FileReader_1_0, ParseToFloat_2_0, Dict{String,Any}()))
	wait(t2)

	t3 = @async Task(AverageFloat_f(ParseToFloat_2_0, AverageFloat_3_0, Dict{String,Any}()))
	wait(t3)

	t4 = @async Task(Median_f(ParseToFloat_2_0, Median_4_0, Dict{String,Any}()))
	wait(t4)

	t5 = @async Task(Histogram_f(ParseToFloat_2_0, Histogram_5_0, Dict{String,Any}()))
	wait(t5)

	t6 = @async Task(Plot_f(ParseToFloat_2_0, Plot_6_0, Dict{String,Any}()))
	wait(t6)

	t7 = @async Task(SavePNG_f(Histogram_5_0, Dict{String,Any}("file_name" => "histogram.png")))
	wait(t7)

	t8 = @async Task(SavePNG_f(Plot_6_0, Dict{String,Any}("file_name" => "plot.png")))
	wait(t8)

	t9 = @async Task(WriteToFile_f(Median_4_0, Dict{String,Any}("file_name" => "median.txt")))
	wait(t9)

	t10 = @async Task(WriteToFile_f(AverageFloat_3_0, Dict{String,Any}("file_name" => "avg.txt")))
	wait(t10)


end
 NewProject_f()

