package com.check24.minitippspiel.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String homeTeam;

    @Column(nullable = false)
    private String awayTeam;

    @Column(nullable = false)
    private Instant kickoffTime;

    private Integer finalHomeGoals;
    private Integer finalAwayGoals;

    @Builder.Default
    @Column(nullable = false)
    private boolean isEvaluated = false;
}
