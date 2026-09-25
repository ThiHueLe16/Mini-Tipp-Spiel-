package com.check24.minitippspiel.dto;

import java.util.List;

//Used when an Admin sets the final result after a match finishes.
public record MatchScoreDto(
        Integer finalHomeGoals,
        Integer finalAwayGoals,
        List<MatchEventDto> events
) {}