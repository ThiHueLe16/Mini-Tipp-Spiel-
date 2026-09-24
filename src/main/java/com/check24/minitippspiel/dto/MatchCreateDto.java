package com.check24.minitippspiel.dto;

import java.time.Instant;

//Used when an Admin creates or schedules a new match before it is played.
public record MatchCreateDto(String homeTeam,
                             String awayTeam,
                             Instant kickoffTime) {

}
