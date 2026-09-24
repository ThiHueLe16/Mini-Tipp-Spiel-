package com.check24.minitippspiel.service;

import com.check24.minitippspiel.model.User;
import com.check24.minitippspiel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User createUser(User user) {
        return userRepository.save(user);
    }

    public List<User> getLeaderboard() {
        return userRepository.findAllByOrderByTotalPointsDesc();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> updateUser(Long id, User updatedData) {
        return userRepository.findById(id)
                .map(existingUser -> {
                    if (updatedData.getUsername() != null) {
                        existingUser.setUsername(updatedData.getUsername());
                    }
                    if (updatedData.getEmail() != null) {
                        existingUser.setEmail(updatedData.getEmail());
                    }
                    if (updatedData.getShippingAddress() != null) {
                        existingUser.setShippingAddress(updatedData.getShippingAddress());
                    }
                    if (updatedData.getTrikotSize() != null) {
                        existingUser.setTrikotSize(updatedData.getTrikotSize());
                    }
                    return userRepository.save(existingUser);
                });
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
}
