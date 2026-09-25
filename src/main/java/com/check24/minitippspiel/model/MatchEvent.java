package com.check24.minitippspiel.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "match_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchEvent {
    //Represents a single event in a match (goal, card, substitution) linked to a Match via a Foreign Key (match_id).
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @Column(nullable = false)
    private Integer minute; // e.g. 24, 45, 88

    @Column(nullable = false)
    private String type; // "GOAL", "YELLOW_CARD", "RED_CARD"

    @Column(nullable = false)
    private String team; // "HOME" or "AWAY"

    private String player; // e.g. "Harry Kane"
    private String description; // e.g. "Header from corner"
}