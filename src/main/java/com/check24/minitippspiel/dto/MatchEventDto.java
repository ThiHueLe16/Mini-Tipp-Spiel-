package com.check24.minitippspiel.dto;
//Defines the JSON structure sent from the frontend for an individual event.
public record MatchEventDto(
        Integer minute,
        String type,        // "GOAL", "YELLOW_CARD", "RED_CARD"
        String team,        // "HOME" or "AWAY"
        String player,
        String description
) {}