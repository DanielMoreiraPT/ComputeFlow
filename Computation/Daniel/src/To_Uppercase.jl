module To_Uppercase
    using JSON
    export uc_channel

# UMMUTABLE  part of module schema.
    struct Function_Info
        name::String
        version::String
        id::UInt64

        Function_Info(name, version, id) = new(name, version, id)
    end

    struct Port_Info
        port_id::UInt64
        port_type::String

        Port_Info(id, type) = new(id, type)
    end

    struct Input_Info
        name::String
        version::String
        id::UInt64
        port::Port_Info

        Input_Info(name, version, id, port) = new(name, version, id, port)
    end

    struct Output_Info
        name::String
        version::String
        id::UInt64
        port::Port_Info

        Output_Info(name, version, id, port) = new(name, version, id, port)
    end

    struct IO_Info
        inputs::Array{Port_Info, 1}
        outputs::Array{Port_Info, 1}

        IO_Info(input_array, output_array) = new(input_array, output_array)
    end
# MUTABLE part of module schema.

    FuncInfo = Function_Info("To_Uppercase", "v.1.0.0",hash("To_Uppercase"*"v.1.0.0"))
    ioInfo = nothing

    struct Options
        all_text::Bool
        just_first_letters::Bool
        from_the_begging::Bool
        fb_amount_of_char::Int64
        from_the_end::Bool
        fe_amount_of_char::Int64
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char) = new(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end

    function set_options()
        name = "$(FuncInfo.id)_options.json"
        options = JSON.parse(read(name, String))

        all_text = get(options,"all_text", 1)
        just_first_letters = get(options,"just_first_letters", 1)
        from_the_begging = get(options,"from_the_begging", 1)
        fb_amount_of_char = get(options,"fb_amount_of_char", 1)
        from_the_end = get(options,"from_the_end", 1)
        fe_amount_of_char = get(options,"fe_amount_of_char", 1)
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end

    function all_text(text)
        uppercase(text)
    end

    function just_first_letters(text)
        result = ""
        words = split(text, " ")
        for word in words
            if word != "" && word[1]>='a' && word[1]<='z'
                word[1] += "A" - "a"
                result *= word
            end
        end
        result
    end

    function from_the_begging(text, amount)
        if length(text) >= amount
            all_text(text)
        else
            for i = 1:amount
                text[i] += "A" - "a"
            end
        end
    end

    function from_the_end(text, amount)
        textlength = length(text)
        if textlength >= amount
            all_text(text)
        else

            for i = 1:amount
                text[textlength - i] += "A" - "a"
            end
        end
        return result
    end

    function get_text()
        println("========> get text")
        txt = take!(uc_channel)
        println(txt)
        return txt
    end

# PROGRAM

    uc_channel = Channel(1)

    println(FuncInfo)
    options = set_options()
    println("1")
    text = get_text()
    println("==>", text)
    result = ""

    if options.all_text
        result = all_text(text)
    else
        if options.just_first_letters
            result = just_first_letters(text)
        elseif options.from_the_begging
            result = from_the_begging(text, options.fb_amount_of_char)
        elseif options.from_the_end
            result = from_the_end(text, fe_amount_of_char)
        end
    end
    #write("txt_result.txt",result)
    println("====", result)
    close(uc_channel)
end
