package com.check24.minitippspiel.dto;

import java.time.Instant;

public record MatchCreateDto(String homeTeam,
                             String awayTeam,
                             Instant kickoffTime) {

}
