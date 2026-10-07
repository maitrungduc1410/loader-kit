using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace LoaderKit.Tests;

internal static class TestVectors
{
    private static readonly Lazy<string> RootDirectory = new(FindDirectory);

    public static string Directory => RootDirectory.Value;

    public static JsonElement Index => Load("index.json");

    public static double Tolerance => Index.GetProperty("tolerance").GetDouble();

    public static IEnumerable<string> Files => Index.GetProperty("files").EnumerateArray().Select(file => file.GetString()!);

    public static JsonElement Load(string file)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(Path.Combine(Directory, file)));
        return document.RootElement.Clone();
    }

    private static string FindDirectory()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "test-vectors");
            if (File.Exists(Path.Combine(candidate, "index.json"))) return candidate;
        }
        throw new DirectoryNotFoundException($"No test-vectors/index.json above {AppContext.BaseDirectory}");
    }
}
